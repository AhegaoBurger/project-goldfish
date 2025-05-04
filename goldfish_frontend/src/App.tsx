import Header from "@/components/header";
import FileUpload from "@/components/file-upload";
import FileList from "@/components/file-list";
import StorageInfo from "@/components/storage-info";

function App() {
  return (
    <>
      <header>
        <Header />
      </header>
      <main className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-amber-600 mb-2">
              Welcome to Goldfish
            </h1>
            <p className="text-gray-600">
              Your secure decentralized storage solution
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="space-y-6">
                <StorageInfo />
                <FileList />
              </div>
            </div>
            <div>
              <FileUpload />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default App;
