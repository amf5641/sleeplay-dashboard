import DocumentList from "@/components/document-list";

export default function ContentPage() {
  return (
    <DocumentList
      apiEndpoint="/api/content"
      categoryEndpoint="/api/content-categories"
      pageTitle="Content"
      itemTypeLabel="Document"
      defaultTitle="Untitled"
      linkPrefix="/content/"
    />
  );
}
