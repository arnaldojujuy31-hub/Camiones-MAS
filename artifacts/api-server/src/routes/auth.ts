import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/login", (req, res) => {
  const { password } = req.body;
  const validPassword = process.env.APP_PASSWORD || "CH1031";

  if (password === validPassword) {
    // In a real app we'd use a JWT, but for simplicity we'll just return success
    res.json({ success: true, token: "authenticated_session_token" });
  } else {
    res.status(401).json({ success: false, error: "Contraseña incorrecta" });
  }
});

export default router;
