// src/server.js
import "dotenv/config";
import app from "./app.js";

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server is running on PORT:${port}`);
});
