import { Routes, Route, Navigate } from "react-router-dom";
import AppShell, { Guard } from "@/components/AppShell";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Members from "@/pages/Members";
import Events from "@/pages/Events";
import Speakers from "@/pages/Speakers";
import Partners from "@/pages/Partners";
import Projects from "@/pages/Projects";
import Scan from "@/pages/Scan";
import Verify from "@/pages/Verify";
import MemberHome from "@/pages/MemberHome";
import SpeakerHome from "@/pages/SpeakerHome";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/me" element={<Guard path="/me"><MemberHome /></Guard>} />
        <Route path="/speaker-hub" element={<Guard path="/speaker-hub"><SpeakerHome /></Guard>} />
        <Route path="/members" element={<Guard path="/members"><Members /></Guard>} />
        <Route path="/events" element={<Events />} />
        <Route path="/speakers" element={<Speakers />} />
        <Route path="/partners" element={<Partners />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/scan" element={<Guard path="/scan"><Scan /></Guard>} />
        <Route path="/verify" element={<Verify />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
