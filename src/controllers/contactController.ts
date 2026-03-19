import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../types";
import { HttpError } from "../types";
import * as contactService from "../services/contactService";

const relationshipSchema = z.enum([
  "recruiter",
  "interviewer",
  "referral",
  "connection",
  "other",
]);

const createContactSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().min(1).max(120),
  company: z.string().min(1).max(120),
  email: z.string().email().optional().or(z.literal("")),
  linkedin: z.string().max(300).optional(),
  phone: z.string().max(30).optional(),
  linkedJobIds: z.array(z.string()).max(50).optional(),
  notes: z.string().max(5000).optional(),
  lastContactDate: z.string().datetime().optional(),
  followUpDate: z.string().datetime().optional(),
  relationship: relationshipSchema.optional(),
});

const updateContactSchema = createContactSchema.partial();

function requireUserId(req: AuthenticatedRequest): string {
  const uid = req.user?.uid;
  if (!uid) throw new HttpError(401, "Unauthorized");
  return uid;
}

function parseDate(val: string | undefined): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date");
  return d;
}

export async function listContactsHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const contacts = await contactService.listContacts(userId);
  res.json({ contacts });
}

export async function getContactsByCompanyHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const company = req.params.company;
  if (!company) throw new HttpError(400, "Company name required");
  const contacts = await contactService.getContactsByCompany(userId, company);
  res.json({ contacts });
}

export async function createContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const input = createContactSchema.parse(req.body);
  const data: any = { ...input };
  if (input.lastContactDate) data.lastContactDate = parseDate(input.lastContactDate);
  if (input.followUpDate) data.followUpDate = parseDate(input.followUpDate);
  const contact = await contactService.createContact(userId, data);
  res.status(201).json({ contact });
}

export async function updateContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const contactId = req.params.id;
  if (!contactId) throw new HttpError(400, "Missing contact id");
  const input = updateContactSchema.parse(req.body);
  const data: any = { ...input };
  if (input.lastContactDate) data.lastContactDate = parseDate(input.lastContactDate);
  if (input.followUpDate) data.followUpDate = parseDate(input.followUpDate);
  const contact = await contactService.updateContact(userId, contactId, data);
  res.json({ contact });
}

export async function deleteContactHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = requireUserId(req);
  const contactId = req.params.id;
  if (!contactId) throw new HttpError(400, "Missing contact id");
  await contactService.deleteContact(userId, contactId);
  res.status(204).send();
}
