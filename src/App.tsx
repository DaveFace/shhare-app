import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components";
import { KeysProvider } from "./contexts/app-context";
import { Toaster } from "sonner";
import "./App.css";

import { KeysPage } from "./pages/keys-page";
import { HomePage } from "./pages/home-page";
import { InfoPage } from "./pages/info-page";
import { NotePage } from "./pages/notes-page";

function App() {
  return (
    <KeysProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/keys" element={<KeysPage />} />
            <Route path="/notes" element={<NotePage />} />
            <Route path="/info" element={<InfoPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster position="top-center" richColors closeButton visibleToasts={3}  />
    </KeysProvider>
  );
}

export default App;
