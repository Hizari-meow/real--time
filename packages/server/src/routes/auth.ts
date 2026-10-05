import { Router, Request, Response } from 'express';
import { AuthService } from '../core/auth/AuthService.js';
import { authenticate } from '../core/auth/AuthMiddleware.js';

export const authRouter = Router();
const authService = new AuthService();

/**
 * Cookie options helper
 * In local dev (HTTP localhost), secure must be false so browsers accept cookies.
 * In production with HTTPS, secure must be true.
 */
const isSecureCookie =
  process.env.COOKIE_SECURE === 'true' ||
  (process.env.NODE_ENV === 'production' &&
    process.env.COOKIE_SECURE !== 'false' &&
    process.env.USE_HTTPS === 'true');

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isSecureCookie,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 mins
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isSecureCookie,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * POST /api/auth/register
 */
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, orgName } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const result = await authService.register({
      email,
      password,
      name,
      orgName,
      ip: String(clientIp),
    });

    res.cookie('collab_access_token', result.tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('collab_refresh_token', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Lỗi xử lý đăng ký tài khoản',
    });
  }
});

/**
 * POST /api/auth/login
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const result = await authService.login({
      email,
      password,
      ip: String(clientIp),
    });

    res.cookie('collab_access_token', result.tokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('collab_refresh_token', result.tokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Lỗi xử lý đăng nhập',
    });
  }
});

/**
 * POST /api/auth/refresh
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.body?.refreshToken || (req.cookies && req.cookies.collab_refresh_token);
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const newTokens = await authService.refresh(refreshToken, String(clientIp));

    res.cookie('collab_access_token', newTokens.accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('collab_refresh_token', newTokens.refreshToken, REFRESH_COOKIE_OPTIONS);

    return res.json({
      success: true,
      data: newTokens,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Lỗi làm mới token',
    });
  }
});

/**
 * POST /api/auth/logout
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken =
      req.body?.refreshToken || (req.cookies && req.cookies.collab_refresh_token);
    const userId = req.user?.userId;
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';

    await authService.logout(refreshToken, userId, String(clientIp));

    res.clearCookie('collab_access_token', { path: '/' });
    res.clearCookie('collab_refresh_token', { path: '/' });

    return res.json({
      success: true,
      message: 'Đăng xuất thành công',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Lỗi khi đăng xuất',
    });
  }
});

/**
 * GET /api/auth/me
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const result = await authService.getMe(req.user!.userId);
    return res.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    const statusCode = err.status || 500;
    return res.status(statusCode).json({
      success: false,
      error: err.message || 'Lỗi lấy thông tin tài khoản',
    });
  }
});
