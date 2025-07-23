Login error: Error [PrismaClientKnownRequestError]:
Invalid `prisma.admin.findUnique()` invocation:

The table `public.Admin` does not exist in the current database.
at hI.handleRequestError (.next/server/chunks/28.js:114:8027)
at hI.handleAndLogRequestError (.next/server/chunks/28.js:114:7087)
at hI.request (.next/server/chunks/28.js:114:6794)
at async f (.next/server/chunks/28.js:126:7668)
at async x (.next/server/app/api/auth/login/route.js:1:909)
at async k (.next/server/app/api/auth/login/route.js:1:3979)
at async g (.next/server/app/api/auth/login/route.js:1:4982) {
code: 'P2021',
clientVersion: '6.12.0',
meta: [Object]
}
