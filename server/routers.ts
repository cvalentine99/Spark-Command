import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { metricsRouter } from "./routers/metrics";
import { sparkRouter } from "./routers/spark";
import { localRouter } from "./routers/local";
import { logsRouter } from "./routers/logs";
import { powerRouter } from "./routers/power";
import { configRouter } from "./routers/config";
import { clusterRouter } from "./routers/cluster";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  metrics: metricsRouter,
  spark: sparkRouter,
  local: localRouter,
  logs: logsRouter,
  power: powerRouter,
  config: configRouter,
  cluster: clusterRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
