const express = require('express');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static(__dirname));
app.listen(port, () => console.log(`Huni Piano is running at http://localhost:${port}`));
