# ECS162_HW2

To run application:

- python3 app.py
- go to http://127.0.0.1:8000

Testing:

Python flask test:

- cd hw2-app
- PYTHONPATH=./ pytest tests/test_app.py

Jest:

- cd hw2-app
- npx jest --runTestsByPath tests/main.test.js

Cypress:

- npx cypress run --spec "cypress/integration/auth_spec.js"

Node modules:
- npm init
