import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LiveAuctionPage from './pages/LiveAuctionPage';
import TeamsOverviewPage from './pages/TeamsOverviewPage';
import TeamUserPage from './pages/TeamUserPage';
import AIEvalPage from './pages/AIEvalPage';
import AllPlayersPage from './pages/AllPlayersPage';
import TopNav from './components/TopNav';

export default function App() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/live" element={<LiveAuctionPage />} />
        <Route path="/teams" element={<TeamsOverviewPage />} />
        <Route path="/team-view" element={<TeamUserPage />} />
        <Route path="/players" element={<AllPlayersPage />} />
        <Route path="/ai-eval" element={<AIEvalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
