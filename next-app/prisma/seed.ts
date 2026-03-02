import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: "admin@sleeplay.com", password: "Sleeplay2025!" },
    { email: "aaron.fuhrman@sleeplay.com", password: "Sleeplay@123" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash: await bcrypt.hash(u.password, 10) },
    });
  }

  const cats = [
    { id: "cat-onboarding", name: "Onboarding", parentId: null },
    { id: "cat-operations", name: "Operations", parentId: null },
    { id: "cat-shipping", name: "Shipping", parentId: "cat-operations" },
    { id: "cat-inventory", name: "Inventory", parentId: "cat-operations" },
    { id: "cat-support", name: "Support", parentId: null },
    { id: "cat-sales", name: "Sales", parentId: null },
  ];
  for (const cat of cats) {
    await prisma.category.upsert({ where: { id: cat.id }, update: {}, create: cat });
  }

  const people = [
    { id: "person-ceo", name: "Jordan Lee", title: "CEO", managerId: null },
    { id: "person-vp1", name: "Sam Rivera", title: "VP of Operations", managerId: "person-ceo" },
    { id: "person-vp2", name: "Alex Chen", title: "VP of Product", managerId: "person-ceo" },
    { id: "person-mgr1", name: "Morgan Taylor", title: "Operations Manager", managerId: "person-vp1" },
    { id: "person-mgr2", name: "Casey Davis", title: "Product Lead", managerId: "person-vp2" },
  ];
  for (const p of people) {
    await prisma.person.upsert({ where: { id: p.id }, update: {}, create: p });
  }

  const docs = [
    { title: "Welcome to our company", categoryId: "company", content: "" },
    { title: "Office Overview", categoryId: "company", content: "" },
    { title: "Our Target Market", categoryId: "company", content: "" },
    { title: "Services Overview", categoryId: "company", content: "" },
    { title: "Our 3-year plan", categoryId: "policies", content: "" },
    { title: "Voice & Style Guides", categoryId: "processes", content: "" },
  ];
  for (const doc of docs) {
    await prisma.contentDocument.create({ data: doc });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
