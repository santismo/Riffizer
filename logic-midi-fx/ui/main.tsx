import { createRoot } from "react-dom/client";
import RiffizerClient from "../../app/riffizer-client";
import "../../app/globals.css";

document.documentElement.dataset.riffizerHost = "logic-midi-fx";
createRoot(document.getElementById("root")!).render(<RiffizerClient />);
