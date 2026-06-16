#!/bin/bash

# phpMyAdmin Installation Script for Ubuntu/Debian (with Apache)

set -e

echo "Installing dependencies (Apache, PHP, MySQL extension)..."
sudo apt update
sudo apt install -y apache2 php libapache2-mod-php php-mysql

echo "Configuring debconf for non-interactive installation of phpMyAdmin..."

# Set debconf selections to automate phpmyadmin installation
# 1. Use dbconfig-common to configure the database
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig-install boolean true"
# 2. Configure apache2 as the web server
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/reconfigure-webserver boolean true"
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/apache/configure boolean true"
# 3. Database configuration
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/database boolean true"
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/host boolean localhost"
# You can change these if needed
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/username string dbadmin"
sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/password string password"

echo "Installing phpMyAdmin..."
sudo apt install -y phpmyadmin

echo "Restarting Apache to apply changes..."
sudo systemctl restart apache2

echo "--------------------------------------------------------"
echo "phpMyAdmin installation completed successfully."
echo "--------------------------------------------------------"
echo "Access phpMyAdmin at: http://localhost/phpmyadmin"
echo "Note: Ensure your web server is running and you have configured the database user."
echo ""
