import { PrismaClient } from '@prisma/client';
import config from '../src/config/configuration';
import { genres } from './seed-data/genres';
import { users } from './seed-data/users';
import { cinemas } from './seed-data/cinemas';
import { halls } from './seed-data/halls';
import { movies } from './seed-data/movies';
import { concessions } from './seed-data/concessions';

const prisma = new PrismaClient();

// Notes:
// - Supabase manages auth users. This seeder REQUIRES SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
//   to be set. It will create auth users in Supabase for each seeded user and use their IDs
//   for the Prisma User records. Seeding will fail if Supabase auth creation fails.

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

// Seed Users
async function seedUsers(createdCinemas: any[]) {
  console.log('👥 Seeding users...');
  
  // Check for required Supabase environment variables
  const { supabase } = config();
  const SUPABASE_URL = supabase.url;
  const SUPABASE_SERVICE_KEY = supabase.serviceRoleKey;
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to seed users with Supabase auth.');
  }
  
  // Assign cinema IDs to managers and staff
  const updatedUsers = users.map((user, index) => {
    if (user.role === 'MANAGER' && index === 1) {
      return { ...user, cinemaId: createdCinemas[0]?.id }; // First manager -> First cinema
    } else if (user.role === 'MANAGER' && index === 2) {
      return { ...user, cinemaId: createdCinemas[2]?.id }; // Second manager -> Third cinema
    } else if (user.role === 'STAFF' && index === 3) {
      return { ...user, cinemaId: createdCinemas[0]?.id }; // First staff -> First cinema
    } else if (user.role === 'STAFF' && index === 4) {
      return { ...user, cinemaId: createdCinemas[2]?.id }; // Second staff -> Third cinema
    }
    return user;
  });

  async function createAuthUser(email: string, metadata = {}) {
    const password = "Password123!"; // Default password for seeded users

    const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: metadata,
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Failed to create Supabase auth user for ${email}: ${resp.status} ${body}`);
    }

    const data = await resp.json();
    if (!data?.id) {
      throw new Error(`Supabase did not return an ID for user ${email}`);
    }
    return data.id;
  }

  for (const user of updatedUsers) {
    const { email, fullName, phone, role, cinemaId } = user as any;

    console.log(`Creating Supabase auth user for ${email}...`);
    const authId = await createAuthUser(email, { name: fullName, phone });
    console.log(`✓ Created auth user ${email} -> id ${authId}`);

    const result = await prisma.user.upsert({
      where: { email },
      update: { id: authId, fullName, phone, role, cinemaId },
      create: { id: authId, email, fullName, phone, role, cinemaId },
    });
    console.log(`✓ Created/updated Prisma user: ${result.email} (${result.role})`);
  }
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

// Seed Sample Reviews
async function seedReviews(createdCinemas: any[]) {
  console.log('⭐ Seeding sample reviews...');
  
  const sampleReviews = [
    {
      cinemaId: createdCinemas[0]?.id,
      userEmail: 'user1@example.com',
      rating: 5,
      comment: 'Great cinema! Clean and comfortable seats.',
    },
    {
      cinemaId: createdCinemas[0]?.id,
      userEmail: 'user2@example.com',
      rating: 4,
      comment: 'Good sound system, but parking is limited.',
    },
    {
      cinemaId: createdCinemas[2]?.id,
      userEmail: 'user1@example.com',
      rating: 5,
      comment: 'Amazing IMAX experience! Will come back.',
    },
  ];
  
  for (const review of sampleReviews) {
    if (!review.cinemaId) continue;

    const user = await prisma.user.findUnique({ where: { email: (review as any).userEmail } });
    if (!user) {
      console.warn(`Skipping review: user ${(review as any).userEmail} not found`);
      continue;
    }

    await prisma.cinemaReview.create({
      data: {
        cinemaId: review.cinemaId,
        userId: user.id,
        rating: review.rating,
        comment: review.comment,
      },
    });
    console.log(`✓ Created review for cinema ${review.cinemaId} by ${user.email}`);
  }
}

// Main seeding function
async function main() {
  console.log('🌱 Starting database seeding...\n');

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
    await prisma.user.deleteMany({});
    await prisma.cinema.deleteMany({});
    await prisma.movie.deleteMany({});
    await prisma.genre.deleteMany({});
    console.log('✓ Cleanup complete\n');

    // Seed in order
    await seedGenres();
    console.log();
    
    const createdCinemas = await seedCinemas();
    console.log();
    
    await seedUsers(createdCinemas);
    console.log();
    
    const createdHalls = await seedHalls(createdCinemas);
    console.log();
    
    const createdMovies = await seedMovies();
    console.log();
    
    await seedShowtimes(createdCinemas, createdHalls, createdMovies);
    console.log();
    
    await seedConcessions(createdCinemas);
    console.log();
    
    await seedReviews(createdCinemas);
    console.log();

    console.log('✅ Database seeding completed successfully! 🎉');
    console.log('\n📊 Summary:');
    console.log(`   - ${genres.length} genres`);
    console.log(`   - ${createdCinemas.length} cinemas`);
    console.log(`   - ${createdHalls.length} halls`);
    console.log(`   - ${createdMovies.length} movies`);
    console.log(`   - ${users.length} users`);
    console.log(`   - ${concessions.length} concessions`);
    console.log(`   - Multiple showtimes with dynamic pricing`);
    console.log(`   - Sample reviews`);
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