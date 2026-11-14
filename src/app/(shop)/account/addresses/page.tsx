import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddressList from "@/components/AddressList";

export const metadata = { title: "Sổ địa chỉ" };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const addresses = await prisma.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { id: "asc" }] });
  return <AddressList addresses={addresses} />;
}
