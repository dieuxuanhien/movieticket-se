import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/auth.dto';
import { ClerkGuard } from '../../common/guards/clerk.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Note: With Clerk, most authentication is handled on the frontend
   * Sign in/Sign up use Clerk's components: <SignIn />, <SignUp />
   * This endpoint is for API-based signup if needed
   */
  @Post('signup')
  @ApiOperation({
    summary: 'Register a new user (API-based)',
    description: 'For most cases, use Clerk frontend components for signup',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  /**
   * Get current user profile
   * User is authenticated by ClerkGuard
   */
  @Get('me')
  @UseGuards(ClerkGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile with database info',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user);
  }
}
