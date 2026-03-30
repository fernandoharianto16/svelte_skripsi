import { admin } from '../firebaseAdmin.js';

export async function verifyToken(req, res, next) {
	const authHeader = req.headers.authorization;

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "No token" });
	}

	const token = authHeader.split("Bearer ")[1];

	try {
		const decoded = await admin.auth().verifyIdToken(token);
		req.user = decoded;
		next();
	} catch (err) {
		return res.status(401).json({ message: "Invalid token" });
	}
}