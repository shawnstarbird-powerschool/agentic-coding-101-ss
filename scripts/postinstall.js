const { exec } = require("child_process");

const cmd = (process.platform === "win32"
  ? `${__dirname}/postinstall.bat`
  : `${__dirname}/postinstall`
);

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.log(`error: ${error.message}`);
    return 1;
  }
  if (stderr) {
    console.log(`stderr: ${stderr}`);
    return 1;
  }
  console.log(`success: ${stdout}`);
});
