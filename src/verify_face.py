import json
import sys
import face_recognition
import os
import threading

class FacialDetectionError(Exception):
    pass

def compute_face_similarity(reference_image_path, punched_in_image_path, results):
    try:
        # Check if image files exist
        if not os.path.isfile(reference_image_path):
            raise FileNotFoundError(f"Reference image not found: {reference_image_path}")
        if not os.path.isfile(punched_in_image_path):
            raise FileNotFoundError(f"Punched in image not found: {punched_in_image_path}")

        # print("Please wait...")
        # Load the images
        reference_image = face_recognition.load_image_file(reference_image_path)
        punched_in_image = face_recognition.load_image_file(punched_in_image_path)

        # Encode the faces
        reference_face_encodings = face_recognition.face_encodings(reference_image)
        punched_in_face_encodings = face_recognition.face_encodings(punched_in_image)

        if not reference_face_encodings:
            raise FacialDetectionError("No face detected in the reference image")
        if not punched_in_face_encodings:
            raise FacialDetectionError("No face detected in the punched in image")

        reference_face_encoding = reference_face_encodings[0]
        punched_in_face_encoding = punched_in_face_encodings[0]

        # Compare the faces
        face_distances = face_recognition.face_distance([reference_face_encoding], punched_in_face_encoding)

        # Total number of comparisons
        total_comparisons = len(face_distances)

        # print("Comparing faces:")

        for i, face_distance in enumerate(face_distances, start=1):
            progress_percentage = (i / total_comparisons) * 100
            # print(f"Progress: {progress_percentage:.2f}%")
            results.append({"image": i, "accuracy": 1 - face_distance})  # Store the results

    except Exception as e:
        results.append({"error": str(e)})

def run_face_recognition(reference_image_path, punched_in_image_path, results):
    thread = threading.Thread(target=compute_face_similarity, args=(reference_image_path, punched_in_image_path, results))
    thread.start()
    thread.join()  # Wait for the thread to finish

if __name__ == "__main__":
    # Get file paths from command line arguments
    if len(sys.argv) != 3:
        print("Usage: python verify_face.py <reference_image_path> <punched_in_image_path>")
        sys.exit(1)

    # Convert relative paths to absolute paths
    current_directory = os.path.dirname(os.path.realpath(__file__))

    # Replace '\src\' with '/public/'
    current_directory = current_directory.replace('/src', '/public')
    current_directory = current_directory.replace('\\src', '/public')

    # Relative paths without the leading slash
    reference_image_relpath = sys.argv[1]
    punched_in_image_relpath = sys.argv[2]

    # Construct the full paths
    reference_image_path = current_directory + '/' + reference_image_relpath
    punched_in_image_path = current_directory + '/' + punched_in_image_relpath

    # print(f"Reference image: {reference_image_path}")
    # print(f"Punched in image: {punched_in_image_path}")

    try:
        # Verify face and print the result
        results = []
        run_face_recognition(reference_image_path, punched_in_image_path, results)

        print(json.dumps(results))
    except FileNotFoundError as e:
        print(f"Error: {e}")
    except FacialDetectionError as e:
        print(f"Error: {e}")
