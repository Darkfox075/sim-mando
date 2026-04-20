# Modificar el banco de preguntas

Para cambiar, agregar o corregir preguntas, edita solo este archivo:

`question-bank.js`

Cada pregunta debe mantener esta estructura:

```js
{
  id: 1,
  question: "Texto del enunciado",
  options: [
    "Alternativa 1",
    "Alternativa 2",
    "Alternativa 3",
    "Alternativa 4"
  ],
  answer: "Texto exacto de la alternativa correcta"
}
```

Reglas importantes:

- `answer` debe ser exactamente igual a una de las alternativas de `options`.
- Mantén 4 alternativas por pregunta.
- No necesitas tocar `script.js`, `styles.css` ni `index.html` para modificar el banco.
- El simulador mezcla las preguntas y alternativas automáticamente.
