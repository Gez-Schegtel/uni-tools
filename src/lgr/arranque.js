/* ---------- arranque ---------- */
const recuperado = recuperarAutoguardado();
pasarAInputs();
if (innerWidth <= 820) { $('#detalles').classList.add('collapsed'); $('#b-det').classList.remove('on'); }
calcular();
autoActivo = true;                                 // desde acá, cada cambio queda guardado
if (recuperado) setTimeout(() => toast('Se recuperó tu último lugar de raíces'), 60);
