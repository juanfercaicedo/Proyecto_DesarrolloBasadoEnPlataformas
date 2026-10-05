# **Auditoría de la carpeta 'PrimerBosquejo'**

## **Vulnerabilidades de seguridad**

### 1. **Inyección de código en el script.js**

Archivo: `script.js`
Nivel de severidad: **Alta**

Descripción: El script.js utiliza la función `eval()` para ejecutar código proporcionado por el usuario, lo que puede llevar a una inyección de código y comprometer la seguridad del sitio web.

Por qué es un problema: La inyección de código puede permitir a un atacante ejecutar código malicioso en el servidor, lo que puede llevar a la exfiltración de datos confidenciales, la modificación de la base de datos o incluso la toma del control del sitio web.

## **Malas prácticas de programación**

### 1. **Uso de variables globales**

Archivo: `script.js`
Nivel de severidad: **Media**

Descripción: El script.js utiliza variables globales como `cart` y `drawer` para almacenar datos y estado del sitio web.

Por qué es un problema: El uso de variables globales puede llevar a problemas de concurrencia y difícil depuración, ya que las variables pueden ser modificadas en cualquier parte del código.

### 2. **Duplicación de código**

Archivo: `script.js`
Nivel de severidad: **Baja**

Descripción: El script.js tiene duplicados en el código para renderizar la lista de productos y calcular el total.

Por qué es un problema: La duplicación de código puede hacer que el código sea difícil de mantener y depurar, ya que cada copia del código debe ser actualizada de forma independiente.

### 3. **Falta de comentarios**

Archivo: `script.js`
Nivel de severidad: **Baja**

Descripción: El script.js carece de comentarios que expliquen la lógica y el propósito de cada sección de código.

Por qué es un problema: La falta de comentarios puede hacer que el código sea difícil de entender y depurar, ya que los desarrolladores deben analizar el código en lugar de leer los comentarios.

## **Ineficiencias de rendimiento o código redundante**

### 1. **Uso de `eval()`**

Archivo: `script.js`
Nivel de severidad: **Alta**

Descripción: El script.js utiliza la función `eval()` para ejecutar código proporcionado por el usuario.

Por qué es un problema: El uso de `eval()` puede llevar a problemas de rendimiento y seguridad, ya que el código se ejecuta en el contexto del script.js en lugar de en el contexto del servidor.

### 2. **Duplicación de código para renderizar la lista de productos**

Archivo: `script.js`
Nivel de severidad: **Baja**

Descripción: El script.js tiene duplicados en el código para renderizar la lista de productos.

Por qué es un problema: La duplicación de código puede hacer que el código sea difícil de mantener y depurar, ya que cada copia del código debe ser actualizada de forma independiente.

## **Errores de accesibilidad (si aplica al HTML/CSS)**

### 1. **Falta de etiquetas de accesibilidad**

Archivo: `index.html`
Nivel de severidad: **Baja**

Descripción: El archivo `index.html` carece de etiquetas de accesibilidad para describir la estructura y el propósito de la página.

Por qué es un problema: La falta de etiquetas de accesibilidad puede hacer que la página sea difícil de navegar para personas con discapacidades visuales, ya que no pueden acceder a la información proporcionada por las etiquetas.

### 2. **Uso de estilos no accesibles**

Archivo: `index.html`
Nivel de severidad: **Baja**

Descripción: El archivo `index.html` utiliza estilos no accesibles que pueden hacer que la página sea difícil de navegar para personas con discapacidades visuales.

Por qué es un problema: El uso de estilos no accesibles puede hacer que la página sea difícil de navegar para personas con discapacidades visuales, ya que no pueden acceder a la información proporcionada por los estilos.

## **Conclusiones**

La auditoría ha identificado varias vulnerabilidades de seguridad, malas prácticas de programación, ineficiencias de rendimiento y código redundante en la carpeta 'PrimerBosquejo'. Es importante abordar estos problemas para asegurar la seguridad y la accesibilidad del sitio web.
