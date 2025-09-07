import {
  Route,
  BrowserRouter,
  Link,
  Routes,
} from "react-router-dom";
import { CampaignsPage } from './pages/CampaignsPage'
import { CampaignDetail } from "./pages/CampaignDetail";



function App() {
 
  return (
    <BrowserRouter>
      <div className="max-w-5xl mx-auto p-4">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold"><Link to="/">Transiett Vouchers</Link></h1>
        </header>
        <Routes>
          <Route path="/" element={<CampaignsPage />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
