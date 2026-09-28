import { BrowserRouter, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar";
import ChatWidget from "./components/ChatWidget";
import { AuthProvider } from "./context/AuthContext";
import { SearchResultsProvider } from "./context/SearchResultsContext";
import { RecentlyViewedProvider } from "./context/RecentlyViewedContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import About from "./pages/About";
import Login from "./pages/Login";
import CreateAccount from "./pages/CreateAccount";

export default function App() {
  return (
    <AuthProvider>
      <SearchResultsProvider>
        <RecentlyViewedProvider>
          <BrowserRouter>
            <NavBar />
            <main>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:productId" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/create-account" element={<CreateAccount />} />
              </Routes>
            </main>
            <ChatWidget />
          </BrowserRouter>
        </RecentlyViewedProvider>
      </SearchResultsProvider>
    </AuthProvider>
  );
}
