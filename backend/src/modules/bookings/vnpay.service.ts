import { Injectable } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { CustomLoggerService } from '../../common/services/logger.service';
import * as crypto from 'crypto';

export interface VNPayBuildUrlParams {
  amount: number;
  orderInfo: string;
  txnRef: string;
  ipAddr: string;
  returnUrl?: string;
  locale?: 'vn' | 'en';
  bankCode?: string;
  bookingExpiresAt: Date;
}

export interface VNPayVerifyResult {
  isVerified: boolean;
  isSuccess: boolean;
  message: string;
  vnp_Amount: number;
  vnp_TxnRef: string;
  vnp_TransactionNo: string;
  vnp_BankCode: string;
  vnp_BankTranNo?: string;
  vnp_PayDate: string;
  vnp_ResponseCode: string;
  vnp_TransactionStatus: string;
}

// VNPAY Response codes
export const VNPayResponseCode = {
  SUCCESS: '00',
  SUSPECTED_FRAUD: '07',
  NOT_REGISTERED: '09',
  INCORRECT_INFO: '10',
  EXPIRED: '11',
  LOCKED: '12',
  WRONG_OTP: '13',
  CANCELLED: '24',
  INSUFFICIENT_BALANCE: '51',
  EXCEEDED_LIMIT: '65',
  BANK_MAINTENANCE: '75',
  WRONG_PAYMENT_PASSWORD: '79',
  OTHER_ERROR: '99',
};

// IPN Response codes
export const IpnResponse = {
  SUCCESS: { RspCode: '00', Message: 'Success' },
  ORDER_NOT_FOUND: { RspCode: '01', Message: 'Order not found' },
  ORDER_ALREADY_CONFIRMED: {
    RspCode: '02',
    Message: 'Order already confirmed',
  },
  INVALID_AMOUNT: { RspCode: '04', Message: 'Invalid amount' },
  CHECKSUM_FAILED: { RspCode: '97', Message: 'Checksum failed' },
  UNKNOWN_ERROR: { RspCode: '99', Message: 'Unknown error' },
};

@Injectable()
export class VnpayService {
  private readonly tmnCode: string;
  private readonly secureSecret: string;
  private readonly vnpayHost: string;
  private readonly vnpayApi: string;
  private readonly returnUrl: string;
  private readonly hashAlgorithm = 'SHA512';
  private readonly vnpVersion = '2.1.0';
  private readonly vnpCommand = 'pay';
  private readonly currCode = 'VND';
  private readonly orderType = 'other'; // Can be: billpayment, fashion, etc.
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger = new CustomLoggerService(VnpayService.name);
    this.tmnCode = this.configService.vnpayTmnCode;
    this.secureSecret = this.configService.vnpaySecureSecret;
    this.vnpayHost = this.configService.vnpayHost;
    this.vnpayApi = this.configService.vnpayApi;
    this.returnUrl = this.configService.vnpayReturnUrl;
  }

  /**
   * Normalize IP address to IPv4 format
   * Handles IPv6-mapped IPv4 addresses like ::ffff:192.168.1.1
   * @param ipAddr Raw IP address
   * @returns Normalized IPv4 address
   */
  private normalizeIpAddress(ipAddr: string): string {
    // Handle IPv6-mapped IPv4 addresses (::ffff:x.x.x.x)
    if (ipAddr.startsWith('::ffff:')) {
      return ipAddr.substring(7); // Remove ::ffff: prefix
    }

    // Handle other IPv6 addresses - return localhost for IPv6
    if (ipAddr.includes(':')) {
      return '127.0.0.1';
    }

    // Return as-is for IPv4 addresses
    return ipAddr;
  }

  /**
   * Build VNPAY payment URL
   * @param params Payment parameters
   * @returns Payment URL string
   */
  buildPaymentUrl(params: VNPayBuildUrlParams): string {
    this.logger.log('Building VNPAY payment URL', {
      txnRef: params.txnRef,
      amount: params.amount,
      originalIpAddr: params.ipAddr,
      normalizedIpAddr: this.normalizeIpAddress(params.ipAddr),
    });

    const date = new Date();
    const createDate = this.formatDate(date);
    // Calculate payment expire from booking expire
    const expireDate = params.bookingExpiresAt;
    const expireDateStr = this.formatDate(expireDate);

    // Build the VNPAY parameters
    const vnpParams: Record<string, string | number> = {
      vnp_Version: this.vnpVersion,
      vnp_Command: this.vnpCommand,
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: params.locale || 'vn',
      vnp_CurrCode: this.currCode,
      vnp_TxnRef: params.txnRef,
      vnp_OrderInfo: this.sanitizeOrderInfo(params.orderInfo),
      vnp_OrderType: this.orderType,
      vnp_Amount: params.amount * 100, // VNPAY expects amount in smallest currency unit
      vnp_ReturnUrl: params.returnUrl || this.returnUrl,
      vnp_IpAddr: this.normalizeIpAddress(params.ipAddr),
      vnp_CreateDate: createDate,
      vnp_ExpireDate: expireDateStr,
    };

    // Add bank code if specified
    if (params.bankCode) {
      vnpParams.vnp_BankCode = params.bankCode;
    }

    // Sort parameters alphabetically
    const sortedParams = this.sortObject(vnpParams);

    // Create the query string for signing (WITH URL encoding as per VNPay docs)
    const signData = this.buildSignatureData(sortedParams);

    // Create the secure hash
    const hmac = crypto.createHmac('sha512', this.secureSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Add secure hash to params
    sortedParams.vnp_SecureHash = signed;

    // Build final URL (also needs URL encoding)
    const paymentUrl = `${this.vnpayHost}?${this.buildQueryStringEncoded(
      sortedParams,
    )}`;

    this.logger.log('VNPAY payment URL built successfully', {
      txnRef: params.txnRef,
      urlLength: paymentUrl.length,
    });

    return paymentUrl;
  }

  /**
   * Verify VNPAY return/IPN data
   * @param vnpParams Query parameters from VNPAY
   * @returns Verification result
   */
  verifyReturnUrl(vnpParams: Record<string, string>): VNPayVerifyResult {
    this.logger.log('Verifying VNPAY return URL', {
      txnRef: vnpParams.vnp_TxnRef,
    });

    const secureHash = vnpParams.vnp_SecureHash;

    // Remove hash fields for verification
    const verifyParams = { ...vnpParams };
    delete verifyParams.vnp_SecureHash;
    delete verifyParams.vnp_SecureHashType;

    // Sort and create sign data
    const sortedParams = this.sortObject(verifyParams);
    const signData = this.buildSignatureData(sortedParams);

    // Calculate hash
    const hmac = crypto.createHmac('sha512', this.secureSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Verify hash
    const isVerified = secureHash === signed;
    const responseCode = vnpParams.vnp_ResponseCode;
    const transactionStatus = vnpParams.vnp_TransactionStatus;
    const isSuccess =
      isVerified && responseCode === '00' && transactionStatus === '00';

    const result: VNPayVerifyResult = {
      isVerified,
      isSuccess,
      message: this.getResponseMessage(responseCode),
      vnp_Amount: parseInt(vnpParams.vnp_Amount, 10) / 100, // Convert back to VND
      vnp_TxnRef: vnpParams.vnp_TxnRef,
      vnp_TransactionNo: vnpParams.vnp_TransactionNo,
      vnp_BankCode: vnpParams.vnp_BankCode,
      vnp_BankTranNo: vnpParams.vnp_BankTranNo,
      vnp_PayDate: vnpParams.vnp_PayDate,
      vnp_ResponseCode: responseCode,
      vnp_TransactionStatus: transactionStatus,
    };

    this.logger.log('VNPAY verification result', {
      txnRef: result.vnp_TxnRef,
      isVerified: result.isVerified,
      isSuccess: result.isSuccess,
      responseCode,
    });

    return result;
  }

  /**
   * Verify IPN call from VNPAY
   * Same as verifyReturnUrl but used for IPN webhook
   */
  verifyIpnCall(vnpParams: Record<string, string>): VNPayVerifyResult {
    return this.verifyReturnUrl(vnpParams);
  }

  /**
   * Format date to VNPAY format (yyyyMMddHHmmss)
   */
  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  /**
   * Sort object keys alphabetically and encode VALUES only (not keys)
   * This matches VNPay's expected signature format
   */
  private sortObject(obj: Record<string, any>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys: string[] = [];

    // Get all keys (DO NOT encode keys)
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        keys.push(key);
      }
    }

    // Sort keys alphabetically
    keys.sort();

    // Build sorted object with original keys and encoded values
    for (const key of keys) {
      // Encode VALUES only, replace %20 with '+'
      sorted[key] = encodeURIComponent(String(obj[key])).replace(/%20/g, '+');
    }

    return sorted;
  }

  /**
   * Build signature data string from already-encoded values
   * Keys are NOT encoded, values are already encoded in sortObject
   */
  private buildSignatureData(obj: Record<string, string>): string {
    return Object.keys(obj)
      .map((key) => `${key}=${obj[key]}`)
      .join('&');
  }

  /**
   * Build query string for final payment URL (same as signature data)
   */
  private buildQueryStringEncoded(obj: Record<string, string>): string {
    return Object.keys(obj)
      .map((key) => `${key}=${obj[key]}`)
      .join('&');
  }

  /**
   * Sanitize order info (remove special characters)
   */
  private sanitizeOrderInfo(orderInfo: string): string {
    return orderInfo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim();
  }

  /**
   * Get human-readable message for response code
   */
  private getResponseMessage(responseCode: string): string {
    const messages: Record<string, string> = {
      '00': 'Transaction successful',
      '07': 'Deduction successful, transaction suspected of fraud',
      '09': 'Card/Account not registered for Internet Banking',
      '10': 'Incorrect card/account information verification 3+ times',
      '11': 'Payment timeout',
      '12': 'Card/Account is locked',
      '13': 'Wrong OTP',
      '24': 'Transaction cancelled by customer',
      '51': 'Insufficient balance',
      '65': 'Exceeded daily transaction limit',
      '75': 'Bank is under maintenance',
      '79': 'Wrong payment password 3+ times',
      '99': 'Other error',
    };

    return messages[responseCode] || 'Unknown error';
  }
}
