import { ContactModel } from "../models/Contact";
import { HttpError } from "../types";

export async function listContacts(userId: string) {
  return ContactModel.find({ userId }).sort({ updatedAt: -1 }).lean();
}

export async function getContactsByCompany(userId: string, company: string) {
  return ContactModel.find({
    userId,
    company: { $regex: new RegExp(company, "i") },
  })
    .sort({ updatedAt: -1 })
    .lean();
}

export async function createContact(
  userId: string,
  data: {
    name: string;
    role: string;
    company: string;
    email?: string;
    linkedin?: string;
    phone?: string;
    linkedJobIds?: string[];
    notes?: string;
    lastContactDate?: Date;
    followUpDate?: Date;
    relationship?: string;
  },
) {
  const contact = await ContactModel.create({ userId, ...data });
  return contact.toObject();
}

export async function updateContact(
  userId: string,
  contactId: string,
  data: Partial<{
    name: string;
    role: string;
    company: string;
    email: string;
    linkedin: string;
    phone: string;
    linkedJobIds: string[];
    notes: string;
    lastContactDate: Date;
    followUpDate: Date;
    relationship: string;
  }>,
) {
  const contact = await ContactModel.findOneAndUpdate(
    { _id: contactId, userId },
    { $set: data },
    { new: true },
  ).lean();
  if (!contact) throw new HttpError(404, "Contact not found");
  return contact;
}

export async function deleteContact(userId: string, contactId: string) {
  const result = await ContactModel.findOneAndDelete({
    _id: contactId,
    userId,
  });
  if (!result) throw new HttpError(404, "Contact not found");
}
