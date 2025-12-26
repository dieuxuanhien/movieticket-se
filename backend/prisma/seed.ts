import { PrismaClient } from '@prisma/client';
import { createClerkClient } from '@clerk/backend';
import { genres } from './seed-data/genres';
import { cinemas } from './seed-data/cinemas';
import { halls } from './seed-data/halls';
import { movies } from './seed-data/movies';
import { concessions } from './seed-data/concessions';
import { users } from './seed-data/users';

const prisma = new PrismaClient();
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

// Notes:
// - Users are managed fully in Clerk with publicMetadata
// - This unified script handles both database seeding AND Clerk user creation
// - Database: cinemas, movies, halls, seats, showtimes, pricing, concessions
// - Clerk: users with roles (ADMIN, MANAGER, STAFF, USER) and cinema assignments

const DEFAULT_PASSWORD = 'Password123!';

// Seed Genres
async function seedGenres() {
  console.log('📚 Seeding genres...');
  for (const genre of genres) {
    const result = await prisma.genre.upsert({
      where: { name: genre.name },
      update: genre,
      create: genre,
    });
    console.log(`✓ Created genre: ${result.name}`);
  }
}

// Seed Cinemas
async function seedCinemas() {
  console.log('🎬 Seeding cinemas...');
  const createdCinemas = [];
  for (const cinema of cinemas) {
    const result = await prisma.cinema.create({
      data: cinema,
    });
    createdCinemas.push(result);
    console.log(`✓ Created cinema: ${result.name} in ${result.city}`);
  }
  return createdCinemas;
}

// Seed Halls and Seats
async function seedHalls(createdCinemas: any[]) {
  console.log('🏛️ Seeding halls and seats...');
  const createdHalls = [];
  
  for (const hallData of halls) {
    const cinema = createdCinemas[hallData.cinemaIndex];
    if (!cinema) continue;

    const hall = await prisma.hall.create({
      data: {
        cinemaId: cinema.id,
        name: hallData.name,
        type: hallData.type as any,
        capacity: hallData.capacity,
        status: 'ACTIVE',
      },
    });
    createdHalls.push(hall);
    console.log(`✓ Created hall: ${hall.name} (${hall.type}) at ${cinema.name}`);

    // Generate seats for the hall
    const seats = [];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const seatsPerRow = Math.ceil(hallData.capacity / rows.length);

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      for (let seatNum = 1; seatNum <= seatsPerRow; seatNum++) {
        const totalSeats = seats.length;
        if (totalSeats >= hallData.capacity) break;

        // Determine seat type based on position
        let seatType: 'STANDARD' | 'VIP' | 'COUPLE' = 'STANDARD';
        if (hallData.type === 'VIP' && rowIndex >= 3 && rowIndex <= 6) {
          seatType = 'VIP';
        } else if (rowIndex >= 7 && seatNum % 2 === 1) {
          seatType = 'COUPLE';
        } else if (hallData.type === 'IMAX' && rowIndex >= 4 && rowIndex <= 6) {
          seatType = 'VIP';
        }

        seats.push({
          hallId: hall.id,
          rowLetter: row,
          seatNumber: seatNum,
          type: seatType as any,
        });
      }
    }

    await prisma.seat.createMany({
      data: seats,
    });
    console.log(`  ✓ Created ${seats.length} seats for ${hall.name}`);
  }
  
  return createdHalls;
}

// Seed Movies
async function seedMovies() {
  console.log('🎥 Seeding movies...');
  const createdMovies = [];
  
  for (const movieData of movies) {
    const { genreNames, ...movieInfo } = movieData;
    
    // Find genre IDs
    const genreRecords = await prisma.genre.findMany({
      where: {
        name: {
          in: genreNames,
        },
      },
    });

    const movie = await prisma.movie.create({
      data: {
        ...movieInfo,
        genres: {
          connect: genreRecords.map((g: any) => ({ id: g.id })),
        },
      },
      include: {
        genres: true,
      },
    });

    createdMovies.push(movie);
    console.log(`✓ Created movie: ${movie.title} (${genreRecords.map(g => g.name).join(', ')})`);
  }
  
  return createdMovies;
}

// Seed Showtimes with Ticket Pricing
async function seedShowtimes(createdCinemas: any[], createdHalls: any[], createdMovies: any[]) {
  console.log('📅 Seeding showtimes with ticket pricing...');
  
  const today = new Date();
  const createdShowtimes = [];
  
  // Generate showtimes for the next 7 days
  for (let day = 0; day < 7; day++) {
    const showDate = new Date(today);
    showDate.setDate(today.getDate() + day);
    
    // Create 3-4 showtimes per hall per day
    for (const hall of createdHalls.slice(0, 10)) { // Limit to first 10 halls
      const cinema = createdCinemas.find(c => c.id === hall.cinemaId);
      if (!cinema) continue;
      
      const movieIndex = Math.floor(Math.random() * createdMovies.length);
      const movie = createdMovies[movieIndex];
      
      const times = ['10:00', '14:30', '18:00', '21:30'];
      
      for (let i = 0; i < Math.min(3, times.length); i++) {
        const [hours, minutes] = times[i].split(':').map(Number);
        const startTime = new Date(showDate);
        startTime.setHours(hours, minutes, 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + movie.runtime);
        
        const format: 'IMAX' | 'THREE_D' | 'TWO_D' = hall.type === 'IMAX' ? 'IMAX' : (Math.random() > 0.5 ? 'THREE_D' : 'TWO_D');
        
        const showtime = await prisma.showtime.create({
          data: {
            movieId: movie.id,
            cinemaId: cinema.id,
            hallId: hall.id,
            startTime,
            endTime,
            format,
          },
        });
        
        // Create ticket pricing for different seat types
        const basePriceStandard = 80000;
        const basePriceVIP = 150000;
        const basePriceCouple = 200000;
        
        // Adjust price based on format
        const formatMultiplier = format === 'IMAX' ? 1.5 : (format === 'THREE_D' ? 1.3 : 1);
        
        await prisma.ticketPricing.createMany({
          data: [
            {
              showtimeId: showtime.id,
              seatType: 'STANDARD',
              price: basePriceStandard * formatMultiplier,
            },
            {
              showtimeId: showtime.id,
              seatType: 'VIP',
              price: basePriceVIP * formatMultiplier,
            },
            {
              showtimeId: showtime.id,
              seatType: 'COUPLE',
              price: basePriceCouple * formatMultiplier,
            },
          ],
        });
        
        createdShowtimes.push(showtime);
      }
    }
  }
  
  console.log(`✓ Created ${createdShowtimes.length} showtimes with dynamic pricing`);
  return createdShowtimes;
}

// Seed Concessions
async function seedConcessions(createdCinemas: any[]) {
  console.log('🍿 Seeding concessions...');
  
  for (const concessionData of concessions) {
    const cinemaId = concessionData.cinemaIndex !== null 
      ? createdCinemas[concessionData.cinemaIndex]?.id 
      : null;
    
    const result = await prisma.concession.create({
      data: {
        cinemaId,
        name: concessionData.name,
        price: concessionData.price,
      },
    });
    
    const location = cinemaId ? `at specific cinema` : `(available at all cinemas)`;
    console.log(`✓ Created concession: ${result.name} - ${result.price} VND ${location}`);
  }
}

// Seed Clerk Users
async function seedClerkUsers(createdCinemas: any[]) {
  console.log('👥 Seeding users in Clerk...');
  
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn('⚠️  CLERK_SECRET_KEY not set. Skipping Clerk user creation.');
    console.warn('   Add CLERK_SECRET_KEY to your .env file to enable user seeding.\n');
    return;
  }

  // Parse full name and assign cinemas
  const usersToCreate = users.map((user, index) => {
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Assign cinemas to managers and staff
    let cinemaId = user.cinemaId;
    if (user.role === 'MANAGER' || user.role === 'STAFF') {
      if (index === 1) {
        // First manager -> First cinema
        cinemaId = createdCinemas[0]?.id || null;
      } else if (index === 2) {
        // Second manager -> Third cinema
        cinemaId = createdCinemas[2]?.id || null;
      } else if (index === 3) {
        // First staff -> First cinema
        cinemaId = createdCinemas[0]?.id || null;
      } else if (index === 4) {
        // Second staff -> Third cinema
        cinemaId = createdCinemas[2]?.id || null;
      }
    }

    return {
      email: user.email,
      firstName,
      lastName,
      phone: user.phone,
      role: user.role,
      cinemaId,
      fullName: user.fullName,
    };
  });

  let successCount = 0;
  let skipCount = 0;

  for (const userData of usersToCreate) {
    try {
      const user = await clerkClient.users.createUser({
        emailAddress: [userData.email],
        password: DEFAULT_PASSWORD,
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phone ? [userData.phone] : undefined,
        publicMetadata: {
          role: userData.role,
          cinemaId: userData.cinemaId,
          phone: userData.phone,
          fullName: userData.fullName,
        },
        skipPasswordChecks: true,
        skipPasswordRequirement: false,
      });

      console.log(`✓ Created Clerk user: ${userData.email} (${userData.role})`);
      successCount++;
    } catch (error: any) {
      if (error.errors?.[0]?.code === 'form_identifier_exists') {
        console.warn(`⚠️  User ${userData.email} already exists in Clerk, skipping...`);
        skipCount++;
      } else {
        console.error(`❌ Failed to create user ${userData.email}:`, error.errors || error);
      }
    }
  }

  console.log(
    `\n  Created: ${successCount} users | Skipped: ${skipCount} users (already exist)\n`,
  );
}

// Main seeding function
async function main() {
  console.log('🌱 Starting unified database and Clerk seeding...\n');

  try {
    // Clear existing data (optional - be careful in production!)
    console.log('🧹 Cleaning up existing data...');
    await prisma.seatLock.deleteMany({});
    await prisma.bookingConcession.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.ticketPricing.deleteMany({});
    await prisma.showtime.deleteMany({});
    await prisma.cinemaReview.deleteMany({});
    await prisma.concession.deleteMany({});
    await prisma.seat.deleteMany({});
    await prisma.hall.deleteMany({});
    await prisma.cinema.deleteMany({});
    await prisma.movie.deleteMany({});
    await prisma.genre.deleteMany({});
    console.log('✓ Cleanup complete\n');

    // Seed database first
    await seedGenres();
    console.log();
    
    const createdCinemas = await seedCinemas();
    console.log();
    
    const createdHalls = await seedHalls(createdCinemas);
    console.log();
    
    const createdMovies = await seedMovies();
    console.log();
    
    await seedShowtimes(createdCinemas, createdHalls, createdMovies);
    console.log();
    
    await seedConcessions(createdCinemas);
    console.log();

    // Seed users in Clerk
    await seedClerkUsers(createdCinemas);
    console.log();

    console.log('✅ Unified seeding completed successfully! 🎉');
    console.log('\n📊 Database Summary:');
    console.log(`   - ${genres.length} genres`);
    console.log(`   - ${createdCinemas.length} cinemas`);
    console.log(`   - ${createdHalls.length} halls`);
    console.log(`   - ${createdMovies.length} movies`);
    console.log(`   - ${concessions.length} concessions`);
    console.log(`   - Multiple showtimes with dynamic pricing`);
    console.log(`\n� Clerk Summary:`);
    console.log(`   - ${users.length} users created with roles and cinema assignments`);
    console.log(`\n💡 Default password for all users: ${DEFAULT_PASSWORD}`);
    console.log('   Change passwords in Clerk Dashboard if needed\n');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 