pipeline {
    agent any

    tools {
        maven 'Maven3'
        nodejs 'NodeJS'
    }
    
    triggers {
        pollSCM('* * * * *')
    }

    environment {
        JWT_SECRET = credentials('jwt-secret')
        INTERNAL_TOKEN = credentials('internal-token')
    }

    parameters {
        booleanParam(name: 'ROLLBACK', defaultValue: false, description: 'Déclencher un rollback manuel (sans build)')
    }

    stages {
        
        stage('Checkout Git') {
            when { expression { params.ROLLBACK == false } }
            steps {
                sh 'docker network connect safe-zone_buy-net buy-01-jenkins-1 || true'
                echo 'Git Checkout in Progress...'
                git branch: 'main', url: 'https://github.com/Dahreau/safe-zone'
                sh 'ls backend'
                sh 'ls frontend'
            }
        }

        stage('Docker Check') {
            when { expression { params.ROLLBACK == false } }
            steps {
                sh 'whoami'
                sh 'id'
                sh 'docker version'
                sh 'docker compose version'
                sh 'docker ps'
            }
        }

        stage('Start MongoDB') {
            when { expression { params.ROLLBACK == false } }
            steps {
                script {
                    echo 'Starting MongoDB...'
                    sh 'docker compose -p buy-01 up -d mongo'
                    sh 'docker ps | grep mongo || (echo "MongoDB failed to start" && exit 1)'
                }
            }
        }
        
stage('Build & Test Backend') {
            when { expression { params.ROLLBACK == false } }
            parallel {
                stage('User Service Test') {
                    steps {
                        dir('backend/user-service') {
                            sh 'mvn clean test'
                        }
                    }
                }
                stage('Product Service Test') {
                    steps {
                        dir('backend/product-service') {
                            sh 'mvn clean test'
                        }
                    }
                }
                stage('Media Service Test') {
                    steps {
                        dir('backend/media-service') {
                            sh 'mvn clean test'
                        }
                    }
                }
            }
        }

        stage('SonarQube Backend Analysis') {
            when { expression { params.ROLLBACK == false } }
            steps {
                dir('backend/user-service') {
                    script { env.CURRENT_SERVICE = 'User Service' }
                    withSonarQubeEnv('sonarqube') {
                        sh 'mvn org.sonarsource.scanner.maven:sonar-maven-plugin:5.7.0.6970:sonar -Dsonar.projectKey=safe-zone-user -Dsonar.projectName="safe-zone-user" -Djava.net.preferIPv4Stack=true'
                    }
                    waitForQualityGate(abortPipeline: true)
                }
                dir('backend/product-service') {
                    script { env.CURRENT_SERVICE = 'Product Service' }
                    withSonarQubeEnv('sonarqube') {
                        sh 'mvn org.sonarsource.scanner.maven:sonar-maven-plugin:5.7.0.6970:sonar -Dsonar.projectKey=safe-zone-product -Dsonar.projectName="safe-zone-product" -Djava.net.preferIPv4Stack=true'
                    }
                    waitForQualityGate(abortPipeline: true)
                }
                dir('backend/media-service') {
                    script { env.CURRENT_SERVICE = 'Media Service' }
                    withSonarQubeEnv('sonarqube') {
                        sh 'mvn org.sonarsource.scanner.maven:sonar-maven-plugin:5.7.0.6970:sonar -Dsonar.projectKey=safe-zone-media -Dsonar.projectName="safe-zone-media" -Djava.net.preferIPv4Stack=true'
                    }
                    waitForQualityGate(abortPipeline: true)
                }
            }
        }
        
        stage('Build & Test Frontend') {
            when { expression { params.ROLLBACK == false } }
            steps {
                dir('frontend') {
                    sh 'npm ci --unsafe-perm'
                    sh 'npx puppeteer install'
                    sh 'npm run build'
                    sh 'export CI=true && npm test -- --project=buy-frontend'
                    withSonarQubeEnv('sonarqube') {
                        sh 'npx sonarqube-scanner -Dsonar.projectKey=safe-zone-front -Dsonar.projectName="safe-zone-front" -Dsonar.sources=src -Dsonar.exclusions=**/node_modules/**,**/*.spec.ts'
                    }
                    waitForQualityGate(abortPipeline: true)
                }
            }
        }
    
        stage('Deploy with Rollback Strategy') {
            when { expression { params.ROLLBACK == false } }
            steps {
                script {
                    echo '🚀 Starting deployment process...'
                    
                    sh 'docker images --format "{{.Repository}}:{{.Tag}}" | grep buy-01 | grep \':latest$\' > /tmp/current_images.txt || true'
                    sh 'for img in $(cat /tmp/current_images.txt); do docker tag $img ${img}-backup || true; done'
                    
                    try {
                        sh 'docker compose -p buy-01 build frontend user-service product-service media-service'
                        sh 'docker compose -p buy-01 up -d --force-recreate frontend user-service product-service media-service'
                        sh 'echo "Waiting for services to stabilize... && sleep 10"'
                        // sh 'exit 1'   // Error trigger for rollback testing
                        
                    } catch (Exception e) {
                        echo '❌ Error detected, rollback starting...'
                        sh '''
                            for service in frontend user-service product-service media-service; do
                                if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "buy-01-${service}:latest-backup"; then
                                    docker tag buy-01-${service}:latest-backup buy-01-${service}:latest
                                    echo "Restored buy-01-${service}"
                                fi
                            done
                            docker compose -p buy-01 up -d --force-recreate frontend user-service product-service media-service
                        '''
                        error('Deployment failed and rollback executed. Check logs for details.')
                    }
                }
            }
        }

        stage('Manual Rollback') {
            when { expression { params.ROLLBACK == true } }
            steps {
                script {
                    echo 'Manual rollback triggered...'
                    sh '''
                        for service in frontend user-service product-service media-service; do
                            if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "buy-01-${service}:latest-backup"; then
                                docker tag buy-01-${service}:latest-backup buy-01-${service}:latest
                                echo "Restored buy-01-${service}"

                            fi
                        done
                        docker compose -p buy-01 up -d --force-recreate frontend user-service product-service media-service
                    '''
                    echo '✅ Rollback completed. Services should be restored to previous stable versions.'
                }
            }
        }
    }
    
    post {
        always {
            echo "📊 Pipeline execution finished. Status: ${currentBuild.currentResult}"
            junit '**/target/surefire-reports/*.xml'
        }
        success {
            echo '🎉 All stages completed successfully!'
            mail(
                to: 'darosamakypro@gmail.com',
                subject: "✅ SUCCESS: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: """
                    Build réussi avec succès !
                    
                    Dashboards SonarQube :
                    - User Service : http://sonarqube:9000/dashboard?id=safe-zone-user
                    - Product Service : http://sonarqube:9000/dashboard?id=safe-zone-product
                    - Media Service : http://sonarqube:9000/dashboard?id=safe-zone-media
                    - Frontend : http://sonarqube:9000/dashboard?id=safe-zone-front
                    
                    Job: ${env.JOB_NAME}
                    Build #: ${env.BUILD_NUMBER}
                    URL: ${env.BUILD_URL}
                    Durée: ${currentBuild.durationString}
                """
            )
        }
        failure {
            echo '❌ Pipeline failed! Check logs above.'
            mail(
                to: 'darosamakypro@gmail.com',
                subject: "❌ FAILURE: ${env.JOB_NAME} - Build #${env.BUILD_NUMBER}",
                body: """
                    Build échoué !
                    Le pipeline a bloqué durant l'analyse du service : ${env.CURRENT_SERVICE ?: 'Initialisation / Tests'}
                    
                    Liens directs SonarQube pour vérification :
                    - User Service : http://sonarqube:9000/dashboard?id=safe-zone-user
                    - Product Service : http://sonarqube:9000/dashboard?id=safe-zone-product
                    - Media Service : http://sonarqube:9000/dashboard?id=safe-zone-media
                    - Frontend : http://sonarqube:9000/dashboard?id=safe-zone-front
                    
                    Job: ${env.JOB_NAME}
                    Build #: ${env.BUILD_NUMBER}
                    URL: ${env.BUILD_URL}
                    État: ${currentBuild.currentResult}
                """
            )
        }
    }
}