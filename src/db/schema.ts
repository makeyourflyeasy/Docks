import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

// Users table (maps with Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name'),
  email: text('email').notNull(),
  role: text('role').default('staff'),
  department: text('department'),
  active: boolean('active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// Clients table
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerName: text('owner_name'),
  contact: text('contact'),
  mobileNumber: text('mobile_number'),
  email: text('email'),
  openingBalance: numeric('opening_balance').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Logistics Cases table
export const cases = pgTable('cases', {
  id: text('id').primaryKey(),
  trackingNumber: text('tracking_number'),
  clientName: text('client_name').notNull(),
  clientId: text('client_id'),
  category: text('category').default('Afghan Transit'),
  status: text('status').default('Initiated'),
  containerNumber: text('container_number'),
  blNumber: text('bl_number'),
  gdNumber: text('gd_number'),
  originPort: text('origin_port'),
  destinationPort: text('destination_port'),
  totalCharges: numeric('total_charges').default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Finance Entries & Vouchers
export const financeEntries = pgTable('finance_entries', {
  id: text('id').primaryKey(),
  caseId: text('case_id'),
  voucherNo: text('voucher_no'),
  type: text('type').default('expense'),
  category: text('category'),
  amount: numeric('amount').notNull(),
  date: text('date'),
  description: text('description'),
  partyName: text('party_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Fleet Vehicles
export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  vehicleNo: text('vehicle_no').notNull(),
  driverName: text('driver_name'),
  driverPhone: text('driver_phone'),
  status: text('status').default('Available'),
  vehicleType: text('vehicle_type'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relations
export const casesRelations = relations(cases, ({ many }) => ({
  financeEntries: many(financeEntries),
}));

export const financeEntriesRelations = relations(financeEntries, ({ one }) => ({
  case: one(cases, {
    fields: [financeEntries.caseId],
    references: [cases.id],
  }),
}));
