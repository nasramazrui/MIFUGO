import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'livestock.db'));

const livestock = [
  {
    id: uuidv4(),
    vendorId: 'vendor1',
    tagNumber: 'TAG-001',
    name: 'Brahman Bull',
    species: 'Cow',
    breed: 'Brahman',
    gender: 'male',
    birthDate: '2020-01-01',
    weight: 800,
    status: 'alive',
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?auto=format&fit=crop&q=80&w=800',
    ownerName: 'John Doe',
    ownerPhone: '0700000000',
    location: 'Arusha',
    createdAt: new Date().toISOString()
  },
  {
    id: uuidv4(),
    vendorId: 'vendor1',
    tagNumber: 'TAG-002',
    name: 'Boer Goat',
    species: 'Goat',
    breed: 'Boer',
    gender: 'female',
    birthDate: '2021-05-15',
    weight: 60,
    status: 'alive',
    image: 'https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&q=80&w=800',
    ownerName: 'John Doe',
    ownerPhone: '0700000000',
    location: 'Arusha',
    createdAt: new Date().toISOString()
  }
];

const insert = db.prepare(`
  INSERT INTO livestock (id, vendorId, tagNumber, name, species, breed, gender, birthDate, weight, status, image, ownerName, ownerPhone, location, createdAt)
  VALUES (@id, @vendorId, @tagNumber, @name, @species, @breed, @gender, @birthDate, @weight, @status, @image, @ownerName, @ownerPhone, @location, @createdAt)
`);

livestock.forEach(l => insert.run(l));
console.log('Seeded livestock');
