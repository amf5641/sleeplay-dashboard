import DocumentList from "@/components/document-list";

export default function SopsPage() {
  return (
    <DocumentList
      apiEndpoint="/api/sops"
      categoryEndpoint="/api/categories"
      pageTitle="SOPs"
      itemTypeLabel="SOP"
      defaultTitle="Untitled SOP"
      linkPrefix="/sops/"
    />
  );
}
