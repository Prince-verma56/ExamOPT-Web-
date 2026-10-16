import { ImportExport } from "@/components/examopt/import-export";
import { IMPORT_ENTITIES, type ImportEntity } from "@/server/examopt/csv-import";

export const metadata = {
  title: "Import & Export | ExamOpt Studio",
  description: "Validate, review and import CSV files into the scheduling database, and export any table.",
};

/** `?entity=` only preselects the table; it is checked against the allow-list. */
export default async function ImportExportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { entity } = await searchParams;
  const initialEntity = typeof entity === "string" && (IMPORT_ENTITIES as readonly string[]).includes(entity) ? (entity as ImportEntity) : undefined;
  return <ImportExport initialEntity={initialEntity} />;
}
