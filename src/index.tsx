import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DivWrapper } from "./screens/DivWrapper/DivWrapper";

createRoot(document.getElementById("app") as HTMLElement).render(
  <StrictMode>
    <DivWrapper />
  </StrictMode>,
);
