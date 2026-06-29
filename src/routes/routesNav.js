const router = require('express').Router();

router.post('/RoutesNav', (req, res)=>{

      const { action } = req.body;

  switch (action) {
    case 'administrar_usuario':
      res.redirect('/administrar/usuarios');
      break;
    case 'administrar_empleado':
      res.redirect('/administrar/empleados');
      break;
    case 'administrar_clientes':
      res.redirect('/administrar/clientes');
      break;
    case 'administrar_productos':
        res.redirect('/AdministrarProductos')
        break;
    case 'action_pedido':
        res.redirect('/Agregar');
        break;
    case 'action_cliente':
        res.redirect('/insertCliente');
        break;
    case 'consult_pedido':
        res.redirect('/view');
        break;
    case 'consult_comissions':
        res.redirect('/commissionView');
        break;
    default:
      // Redirige a una página por defecto si la acción no es reconocida
      res.redirect('/');
      break;
  }

})


module.exports = router;