export enum SerializationGroup {
  //Fields visible to everyone (including unauthenticated users)
  PUBLIC = 'public',

  //Fields visible only to authenticated users
  AUTH = 'auth',

  //Fields visible only to the resource owner (self)
  SELF = 'self',

  // Fields visible only to admin users
  ADMIN = 'admin',
}
