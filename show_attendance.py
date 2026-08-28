import pandas as pd
from glob import glob
import os
import tkinter
import csv
import tkinter as tk
from tkinter import *


def subjectchoose(text_to_speech):

    def calculate_attendance():

        Subject = tx.get().strip()

        if Subject == "":
            t = "Please enter the subject name."
            text_to_speech(t)
            return

        # Find attendance CSV files
        filenames = glob(
            f"Attendance\\{Subject}\\{Subject}*.csv"
        )

        # Check whether files exist
        if not filenames:
            t = f"No attendance records found for {Subject}."
            text_to_speech(t)
            return

        # Read all CSV files
        df = [pd.read_csv(f) for f in filenames]

        # Start with first dataframe
        newdf = df[0]

        # Merge remaining attendance files
        for i in range(1, len(df)):
            newdf = newdf.merge(
                df[i],
                how="outer"
            )

        # Replace missing values with 0
        newdf.fillna(0, inplace=True)

        # Create Attendance column as object/string type
        newdf["Attendance"] = ""

        # Calculate attendance percentage
        for i in range(len(newdf)):

            # Take attendance columns only
            attendance_values = newdf.iloc[i, 2:-1]

            # Convert values to numeric
            attendance_values = pd.to_numeric(
                attendance_values,
                errors="coerce"
            )

            # Calculate percentage
            attendance_percentage = (
                int(round(attendance_values.mean() * 100))
            )

            # Store percentage
            newdf.loc[i, "Attendance"] = (
                str(attendance_percentage) + "%"
            )

        # Optional: sort by Enrollment
        # newdf.sort_values(
        #     by=["Enrollment"],
        #     inplace=True
        # )

        # Save final attendance file
        attendance_folder = f"Attendance\\{Subject}"

        os.makedirs(
            attendance_folder,
            exist_ok=True
        )

        output_file = (
            f"{attendance_folder}\\attendance.csv"
        )

        newdf.to_csv(
            output_file,
            index=False
        )

        # Display attendance window
        root = tkinter.Tk()

        root.title(
            "Attendance of " + Subject
        )

        root.configure(
            background="black"
        )

        with open(
            output_file,
            newline=""
        ) as file:

            reader = csv.reader(file)

            r = 0

            for row_data in reader:

                c = 0

                for value in row_data:

                    label = tkinter.Label(
                        root,
                        width=15,
                        height=1,
                        fg="yellow",
                        font=("times", 15, "bold"),
                        bg="black",
                        text=value,
                        relief=tkinter.RIDGE,
                    )

                    label.grid(
                        row=r,
                        column=c
                    )

                    c += 1

                r += 1

        root.mainloop()

        print(newdf)

    # --------------------------------
    # Subject selection window
    # --------------------------------

    subject = Tk()

    subject.title("Subject...")

    subject.geometry("580x320")

    subject.resizable(
        0,
        0
    )

    subject.configure(
        background="black"
    )

    # Title
    titl = tk.Label(
        subject,
        bg="black",
        relief=RIDGE,
        bd=10,
        font=("arial", 30)
    )

    titl.pack(
        fill=X
    )

    titl = tk.Label(
        subject,
        text="Which Subject of Attendance?",
        bg="black",
        fg="green",
        font=("arial", 25),
    )

    titl.place(
        x=100,
        y=12
    )

    # --------------------------------
    # Check Sheets button
    # --------------------------------

    def Attf():

        sub = tx.get().strip()

        if sub == "":
            t = "Please enter the subject name!!!"
            text_to_speech(t)

        else:

            folder_path = f"Attendance\\{sub}"

            if os.path.exists(folder_path):

                os.startfile(
                    folder_path
                )

            else:

                t = f"No attendance folder found for {sub}."
                text_to_speech(t)

    attf = tk.Button(
        subject,
        text="Check Sheets",
        command=Attf,
        bd=7,
        font=("times new roman", 15),
        bg="black",
        fg="yellow",
        height=2,
        width=10,
        relief=RIDGE,
    )

    attf.place(
        x=360,
        y=170
    )

    # --------------------------------
    # Subject label
    # --------------------------------

    sub = tk.Label(
        subject,
        text="Enter Subject",
        width=10,
        height=2,
        bg="black",
        fg="yellow",
        bd=5,
        relief=RIDGE,
        font=("times new roman", 15),
    )

    sub.place(
        x=50,
        y=100
    )

    # --------------------------------
    # Subject input
    # --------------------------------

    tx = tk.Entry(
        subject,
        width=15,
        bd=5,
        bg="black",
        fg="yellow",
        relief=RIDGE,
        font=("times", 30, "bold"),
    )

    tx.place(
        x=190,
        y=100
    )

    # --------------------------------
    # View Attendance button
    # --------------------------------

    fill_a = tk.Button(
        subject,
        text="View Attendance",
        command=calculate_attendance,
        bd=7,
        font=("times new roman", 15),
        bg="black",
        fg="yellow",
        height=2,
        width=12,
        relief=RIDGE,
    )

    fill_a.place(
        x=195,
        y=170
    )

    subject.mainloop()