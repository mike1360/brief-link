import { BrowserRouter, Routes, Route } from 'react-router-dom'
import BriefLinker from './pages/BriefLinker'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BriefLinker />} />
      </Routes>
    </BrowserRouter>
  )
}
