import "./App.css";
import { Navigate, Route, Routes } from "react-router-dom";
import Home from "./Pages/Home";
import Favorites from "./Pages/Favorites";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/Favorites" element={<Navigate to="/favorites" replace />} />
      <Route path="/Login" element={<Navigate to="/login" replace />} />
      <Route path="/Signup" element={<Navigate to="/signup" replace />} />
    </Routes>
  )
}

export default App;
