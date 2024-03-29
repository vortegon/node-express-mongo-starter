import jwt from 'jsonwebtoken';
import { User } from '../resources/user/user.model';

export const newToken = user => {
  return jwt.sign({ id: user.id }, process.env.SECRET_JWT, {
    expiresIn: process.env.JWT_EXP
  });
};

export const verifyToken = token =>
  new Promise((resolve, reject) => {
    jwt.verify(token, process.env.SECRET_JWT, (err, payload) => {
      if (err) return reject(err);
      resolve(payload);
    });
  });

export const signup = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ message: 'need email and password' });
  }

  const user = await User.create(req.body);
  const token = newToken(user);
  return res.status(201).send({ token });
};

export const signin = async (req, res) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).send({ message: 'need email and password' });
  }

  const invalid = { message: 'Invalid email and passoword combination' };

  const user = await User.findOne({ email: req.body.email })
    .select('email password')
    .exec();

  if (!user) {
    return res.status(401).send(invalid);
  }

  const match = await user.checkPassword(req.body.password);

  if (!match) {
    return res.status(401).send(invalid);
  }

  const token = newToken(user);
  return res.status(201).send({ token });
};

export const protect = async (req, res, next) => {
  const bearer = req.headers.authorization;

  if (!bearer || !bearer.startsWith('Bearer ')) {
    return res.status(401).end();
  }

  const token = bearer.split('Bearer ')[1].trim();

  const payload = await verifyToken(token);

  const user = await User.findById(payload.id)
    .select('-password')
    .lean()
    .exec();

  if (!user) {
    return res.status(401).end();
  }

  req.user = user;
  next();
};
