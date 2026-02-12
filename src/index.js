// src/server.js
import "dotenv/config";
import app from "./app.js";
import { connectToDatabase } from "./db/config.js";

const port = process.env.PORT || 4000;

connectToDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server is running on PORT:${port}`);
    });
  })
  .catch((err) => {
    console.log(`Mongodb Connection failed, error: ${err}`);
  });
