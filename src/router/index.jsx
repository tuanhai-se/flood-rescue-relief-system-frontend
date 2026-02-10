import { BrowserRouter, Routes, Route } from "react-router-dom";
import CitizenHome from "../pages/citizen/CitizenHome";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CitizenHome />} />
      </Routes>
    </BrowserRouter>
  );
}
