pipeline {
    agent any
    
    stages {
        stage('Checkout Code') {
            steps {
                // Pulls the latest code from GitHub
                checkout scm
            }
        }
        
        stage('Build Backend Container') {
            steps {
                echo 'Building Backend Image...'
                // Using Windows batch command to run docker build
                bat "docker build -t ai-interviewer-backend:latest ./backend"
            }
        }
        
        stage('Build Frontend Container') {
            steps {
                echo 'Building Frontend Image...'
                bat "docker build -t ai-interviewer-frontend:latest ./frontend"
            }
        }
    }
}