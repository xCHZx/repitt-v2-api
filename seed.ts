import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import { categories, accountStatuses } from './src/database/schema/catalogs.schema';

// Load environment variables
dotenv.config();

const runSeed = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('⏳ Connecting to database...');
  const queryClient = postgres(process.env.DATABASE_URL);
  const db = drizzle(queryClient);

  try {
    console.log('🌱 Seeding Catalogs Data...');

    // 1. Seed Account Statuses
    console.log('Inserting Account Statuses...');
    await db.insert(accountStatuses).values([
      { name: 'Active', active: true },
      { name: 'Inactive', active: true },
      { name: 'Suspended', active: true },
      { name: 'Pending Verification', active: true },
    ]).onConflictDoNothing();

    // 2. Seed Categories (Segments)
    console.log('Inserting Categories...');
    await db.insert(categories).values([
      { name: 'Restaurantes y Cafeterías', active: true },
      { name: 'Comida Rápida y Callejera', active: true },
      { name: 'Bares y Entretenimiento Nocturno', active: true },
      { name: 'Salones de Belleza y Barberías', active: true },
      { name: 'Gimnasios y Centros Deportivos', active: true },
      { name: 'Clínicas y Consultorios Médicos', active: true },
      { name: 'Servicios Veterinarios y Mascotas', active: true },
      { name: 'Tiendas de Ropa y Accesorios', active: true },
      { name: 'Supermercados y Abarrotes', active: true },
      { name: 'Servicios Automotrices y Autolavados', active: true },
      { name: 'Educación, Cursos y Tutorías', active: true },
      { name: 'Servicios para el Hogar y Mantenimiento', active: true },
      { name: 'Tecnología y Reparación de Equipos', active: true },
      { name: 'Servicios Profesionales (Abogados, Contadores, etc.)', active: true },
      { name: 'Arte, Diseño y Fotografía', active: true },
      { name: 'Hoteles y Alojamientos', active: true },
      { name: 'Bienes Raíces y Construcción', active: true },
      { name: 'Logística, Envíos y Transporte', active: true },
      { name: 'Agencias de Viajes y Turismo', active: true },
      { name: 'Eventos, Fiestas y Banquetes', active: true },
      { name: 'Servicios Funerarios', active: true },
      { name: 'Farmacias y Salud Alternativa', active: true },
      { name: 'Librerías, Papelerías y Regalos', active: true },
      { name: 'Floristerías y Viveros', active: true },
      { name: 'Centros de Entretenimiento (Cines, Boliches, etc.)', active: true },
      { name: 'Otro / No Clasificado', active: true },
    ]).onConflictDoNothing();

    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
  } finally {
    // Close the connection
    await queryClient.end();
    process.exit(0);
  }
};

runSeed();
