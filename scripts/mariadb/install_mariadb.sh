#!/bin/bash

# MariaDB Installation Script for Ubuntu/Debian

set -e

echo "Updating package lists..."
 apt update

echo "Installing MariaDB Server..."
 apt install -y mariadb-server

echo "Starting and enabling MariaDB..."
 systemctl start mariadb
 systemctl enable mariadb

echo "--------------------------------------------------------"
echo "MariaDB installation completed successfully."
echo "--------------------------------------------------------"
echo "It is recommended to run ' mariadb-secure-installation' to secure your installation."
echo "To log in as root, use:  mysql -u root"
echo ""



# Create a super user
# -- Create the user
# CREATE USER 'admin_user'@'localhost' IDENTIFIED BY 'secure_password';

# -- Grant all privileges (superuser access)
# GRANT ALL PRIVILEGES ON *.* TO 'admin_user'@'localhost' WITH GRANT OPTION;

# -- Apply changes
# FLUSH PRIVILEGES;
