export const P = {
  home: '/',
  menu: '/menu',
  dish: (id: string) => `/plato/${id}`,
  cart: '/carrito',
  checkout: '/confirmar',
  confirm: '/pedido-recibido',
  profile: '/perfil',
  corp: '/empresarial',
  orders: '/pedidos',
  chat: (num: number) => `/pedidos/${num}/chat`,
}
