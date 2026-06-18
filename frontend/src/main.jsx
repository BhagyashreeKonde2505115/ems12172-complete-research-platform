import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/theme.css";
import App from "./App.jsx";
import { ExperimentProvider } from "./context/ExperimentContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ExperimentProvider>
      <App />
    </ExperimentProvider>
  </React.StrictMode>
);
