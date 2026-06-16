#!/bin/bash

# Integrated MariaDB and phpMyAdmin Installation Script for Ubuntu/Debian

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_mariadb() {
    echo "Installing MariaDB Server..."
    sudo apt update
    sudo apt install -y mariadb-server
    sudo systemctl start mariadb
    sudo systemctl enable mariadb
    echo "MariaDB installed successfully."
}

install_phpmyadmin() {
    echo "Installing dependencies (Apache, PHP, MySQL extension)..."
    sudo apt update
    sudo apt install -y apache2 php libapache2-mod-php php-mysql

    echo "Configuring debconf for non-interactive installation of phpMyAdmin..."
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig-install boolean true"
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/reconfigure-webserver boolean true"
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/apache/configure boolean true"
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/database boolean true"
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/host boolean localhost"
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/username string dbadmin"
    sudo debconf-set-selections <<< "phpmyadmin phpmyadmin/dbconfig/password string password"

    echo "Installing phpMyAdmin..."
    sudo apt install -y phpmyadmin

    echo "Restarting Apache..."
    sudo systemctl restart apache2
    echo "phpMyAdmin installed successfully."
}

echo "What would you like to install?"
echo "1) MariaDB only"
echo "2) phpMyAdmin only"
echo "3) Both MariaDB and phpMyAdmin"
echo "4) Exit"
read -p "Enter choice [1-4]: " choice

case $choice in
    1)
        install_mariadb
        ;;
    2)
        install_phpmyadmin
        ;;
    3)
        install_mariadb
        install_phpmyadmin
        ;;
    4)
        echo "Exiting."
        exit 0
        ;;
    *)
        echo "Invalid option."
        exit 1
        ;;
esac

echo ""
echo "Installation process finished."
