import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TaskList from "./pages/TaskList";
import CreateTask from "./pages/CreateTask";
import TaskDetail from "./pages/TaskDetail";
import TaskResults from "./pages/TaskResults";
import ImportTask from "./pages/ImportTask";

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<TaskList />} />
            <Route path="/create" element={<CreateTask />} />
            <Route path="/task/:taskId" element={<TaskDetail />} />
            <Route path="/task/:taskId/results" element={<TaskResults />} />
            <Route path="/import" element={<ImportTask />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
