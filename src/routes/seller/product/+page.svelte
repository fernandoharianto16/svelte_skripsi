<script>
    // Tempat untuk variabel dan logika JavaScript
    let name = 'Lang';
  
    // Fungsi atau event handler
    const handleClick = () => {
      alert(`Hello, ${name}!`);
    };
  </script>
  
  <style>
    /* Gaya khusus untuk komponen ini (scoped styles) */
    main {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background-color: #f0f0f0;
    }
  
    h1 {
      color: #333;
    }
  
    button {
      padding: 0.5rem 1rem;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 1rem;
    }
  
    button:hover {
      background-color: #0056b3;
    }
  </style>
  
  <main>
    <h1>Hello, {name}! ini buyer product</h1>
    <button on:click={handleClick}>Click Me</button>
  </main>
  