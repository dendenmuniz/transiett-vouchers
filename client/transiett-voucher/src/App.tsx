import {
  Route,
  BrowserRouter,
  Routes,
} from "react-router-dom";
import { CampaignsPage } from './pages/CampaignsPage'
import { CampaignDetail } from "./pages/CampaignDetail";
import { NavBar } from "./components/NavBar";
import { VouchersPage } from "./pages/VouchersPage";



function App() {
 
  return (
    <BrowserRouter>
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex items-center justify-between mb-6">
          
          <NavBar />
          
        </header>
        
        <Routes>
          <Route path="/" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/vouchers" element= {<VouchersPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
