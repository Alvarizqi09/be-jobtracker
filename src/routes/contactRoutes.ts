import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware";
import {
  listContactsHandler,
  getContactsByCompanyHandler,
  createContactHandler,
  updateContactHandler,
  deleteContactHandler,
} from "../controllers/contactController";

export const contactRoutes = Router();

contactRoutes.use(requireAuth);

contactRoutes.get("/", listContactsHandler);
contactRoutes.post("/", createContactHandler);
contactRoutes.get("/company/:company", getContactsByCompanyHandler);
contactRoutes.put("/:id", updateContactHandler);
contactRoutes.delete("/:id", deleteContactHandler);
