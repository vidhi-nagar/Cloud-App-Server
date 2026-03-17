import app from "./src/app.js";
import dotenv from "dotenv";
dotenv.config();

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`sever started on port :${port}`);
});
